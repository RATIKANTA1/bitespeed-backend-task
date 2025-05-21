"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkPrecedence = void 0;
exports.resolveContact = resolveContact;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
var LinkPrecedence;
(function (LinkPrecedence) {
    LinkPrecedence["PRIMARY"] = "primary";
    LinkPrecedence["SECONDARY"] = "secondary";
})(LinkPrecedence || (exports.LinkPrecedence = LinkPrecedence = {}));
async function resolveContact(params) {
    var _a;
    const { email, phoneNumber } = params;
    // Find existing contacts matching either email or phoneNumber
    const contacts = await prisma.contact.findMany({
        where: {
            OR: [
                email ? { email } : undefined,
                phoneNumber ? { phoneNumber } : undefined,
            ].filter(Boolean),
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
    const primaryContact = (_a = contacts.find((c) => c.linkPrecedence === LinkPrecedence.PRIMARY)) !== null && _a !== void 0 ? _a : contacts[0];
    const emailsSet = new Set();
    const phoneNumbersSet = new Set();
    const secondaryContactIds = [];
    for (const c of contacts) {
        if (c.email)
            emailsSet.add(c.email);
        if (c.phoneNumber)
            phoneNumbersSet.add(c.phoneNumber);
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
        if (email)
            emailsSet.add(email);
        if (phoneNumber)
            phoneNumbersSet.add(phoneNumber);
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
