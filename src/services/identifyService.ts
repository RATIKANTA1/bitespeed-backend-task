import { PrismaClient } from '@prisma/client';
import type { Contact as ContactType } from '@prisma/client';

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

  // Find existing contacts matching either email or phoneNumber
  const contacts: ContactType[] = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined,
      ].filter(Boolean) as any[],
    },
    orderBy: { createdAt: 'asc' },
  });

  // If no contact exists, create a primary contact
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

  // Find the primary contact (oldest one with linkPrecedence=PRIMARY or default to first)
  const primaryContact: ContactType =
    contacts.find((c) => c.linkPrecedence === LinkPrecedence.PRIMARY) ??
    contacts[0];

  const emailsSet = new Set<string>();
  const phoneNumbersSet = new Set<string>();
  const secondaryContactIds: number[] = [];

  for (const c of contacts) {
    if (c.email) emailsSet.add(c.email);
    if (c.phoneNumber) phoneNumbersSet.add(c.phoneNumber);
    if (c.linkPrecedence === LinkPrecedence.SECONDARY) {
      secondaryContactIds.push(c.id);
    }
  }

  const incomingEmailExists = email ? emailsSet.has(email) : true;
  const incomingPhoneExists = phoneNumber ? phoneNumbersSet.has(phoneNumber) : true;

  // If new email/phone doesn’t exist, create a secondary contact
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
