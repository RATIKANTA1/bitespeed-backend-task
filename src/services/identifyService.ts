import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export enum LinkPrecedence {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

interface ResolveContactParams {
  email?: string;
  phoneNumber?: string;
}

interface ContactResponse {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

export async function resolveContact(
  params: ResolveContactParams
): Promise<{ contact: ContactResponse }> {
  const { email, phoneNumber } = params;

  // 1. Fetch all matching contacts
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined,
      ].filter(Boolean) as any,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (contacts.length === 0) {
    // 2. No existing contact, create new primary
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.PRIMARY,
      },
    });

    return {
      contact: {
        primaryContactId: newContact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [phoneNumber] : [],
        secondaryContactIds: [],
      },
    };
  }

  // 3. Find the oldest primary contact
  const primaryContacts = contacts.filter(c => c.linkPrecedence === LinkPrecedence.PRIMARY);
  const rootPrimary = primaryContacts.length > 0 ? primaryContacts[0] : contacts[0];

  // 4. Update other primary contacts to secondary
  for (const contact of primaryContacts.slice(1)) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        linkPrecedence: LinkPrecedence.SECONDARY,
        linkedId: rootPrimary.id,
      },
    });
  }

  // 5. Fetch all linked contacts including the root primary and secondaries
  const allLinkedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: rootPrimary.id },
        { linkedId: rootPrimary.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  // 6. Collect all emails, phones, and secondary contact IDs
  const emails = new Set<string>();
  const phoneNumbers = new Set<string>();
  const secondaryContactIds: number[] = [];

  for (const contact of allLinkedContacts) {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    if (contact.id !== rootPrimary.id) {
      secondaryContactIds.push(contact.id);
    }
  }

  // 7. If this email or phone is new, add as secondary
  const alreadyExists = [...emails].includes(email || '') && [...phoneNumbers].includes(phoneNumber || '');

  if (!alreadyExists) {
    const newSecondary = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.SECONDARY,
        linkedId: rootPrimary.id,
      },
    });

    if (email) emails.add(email);
    if (phoneNumber) phoneNumbers.add(phoneNumber);
    secondaryContactIds.push(newSecondary.id);
  }

  return {
    contact: {
      primaryContactId: rootPrimary.id,
      emails: [...emails],
      phoneNumbers: [...phoneNumbers],
      secondaryContactIds,
    },
  };
}
