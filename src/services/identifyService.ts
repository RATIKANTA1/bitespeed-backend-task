import { PrismaClient, Contact as ContactType } from '@prisma/client';

const prisma = new PrismaClient();

export enum LinkPrecedence {
  PRIMARY = "primary",
  SECONDARY = "secondary",
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

  // Step 1: Prepare OR conditions for Prisma
  const orConditions = [
    email ? { email } : null,
    phoneNumber ? { phoneNumber } : null,
  ].filter(Boolean);

  // Step 2: Fetch all related contacts
  const contacts = await prisma.contact.findMany({
    where: {
      OR: orConditions.length > 0 ? (orConditions as any) : undefined,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Step 3: If no match, create new primary contact
  if (contacts.length === 0) {
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

  // Step 4: Determine root primary contact
  const primaryContact = contacts.find(c => c.linkPrecedence === LinkPrecedence.PRIMARY) ?? contacts[0];

  let rootPrimary = primaryContact;

  if (primaryContact.linkedId) {
    const linked = await prisma.contact.findUnique({ where: { id: primaryContact.linkedId } });
    if (linked) {
      rootPrimary = linked;
    }
  }

  const emailsSet = new Set<string>();
  const phoneNumbersSet = new Set<string>();
  const secondaryContactIds: number[] = [];

  for (const contact of contacts) {
    if (contact.email) emailsSet.add(contact.email);
    if (contact.phoneNumber) phoneNumbersSet.add(contact.phoneNumber);
    if (contact.id !== rootPrimary.id) {
      secondaryContactIds.push(contact.id);
    }
  }

  // Step 5: Create secondary contact if input email or phone is new
  const incomingEmailExists = email ? emailsSet.has(email) : true;
  const incomingPhoneExists = phoneNumber ? phoneNumbersSet.has(phoneNumber) : true;

  if (!incomingEmailExists || !incomingPhoneExists) {
    const newSecondary = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.SECONDARY,
        linkedId: rootPrimary.id,
      },
    });
    secondaryContactIds.push(newSecondary.id);
    if (email) emailsSet.add(email);
    if (phoneNumber) phoneNumbersSet.add(phoneNumber);
  }

  return {
    contact: {
      primaryContactId: rootPrimary.id,
      emails: Array.from(emailsSet),
      phoneNumbers: Array.from(phoneNumbersSet),
      secondaryContactIds,
    },
  };
}
