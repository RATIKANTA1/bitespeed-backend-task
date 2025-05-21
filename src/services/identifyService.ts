import { PrismaClient, Contact as ContactType, Prisma } from '@prisma/client';

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

  // Prepare OR conditions for Prisma
  const orConditions = [
    email ? { email } : null,
    phoneNumber ? { phoneNumber } : null,
  ].filter(Boolean) as Prisma.ContactWhereInput[];

  // Fetch matching contacts
  const contacts: ContactType[] = await prisma.contact.findMany({
    where: orConditions.length > 0 ? { OR: orConditions } : {},
    orderBy: { createdAt: 'asc' },
  });

  // If no matching contact exists, create new as PRIMARY
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

  // Identify primary contact (first with PRIMARY or fallback to oldest)
  const primaryContact =
    contacts.find((c) => c.linkPrecedence === LinkPrecedence.PRIMARY) ??
    contacts[0];

  const emailsSet = new Set<string>();
  const phoneNumbersSet = new Set<string>();
  const secondaryContactIds: number[] = [];

  for (const contact of contacts) {
    if (contact.email) emailsSet.add(contact.email);
    if (contact.phoneNumber) phoneNumbersSet.add(contact.phoneNumber);
    if (contact.linkPrecedence === LinkPrecedence.SECONDARY) {
      secondaryContactIds.push(contact.id);
    }
  }

  const incomingEmailExists = email ? emailsSet.has(email) : true;
  const incomingPhoneExists = phoneNumber ? phoneNumbersSet.has(phoneNumber) : true;

  // If new info (email/phone) is not found, create a secondary contact
  if (!incomingEmailExists || !incomingPhoneExists) {
    const newSecondary = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.SECONDARY,
        linkedId: primaryContact.id,
      },
    });

    secondaryContactIds.push(newSecondary.id);
    if (email) emailsSet.add(email);
    if (phoneNumber) phoneNumbersSet.add(phoneNumber);
  }

  return {
    contact: {
      primaryContactId: primaryContact.id,
      emails: Array.from(emailsSet),
      phoneNumbers: Array.from(phoneNumbersSet),
      secondaryContactIds,
    },
  };
}
