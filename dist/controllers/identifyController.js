"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyContact = identifyContact;
const zod_1 = require("zod");
const identifyService_1 = require("../services/identifyService");
const InputSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phoneNumber: zod_1.z.string().optional(),
});
async function identifyContact(req, res) {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { email, phoneNumber } = parsed.data;
    if (!email && !phoneNumber) {
        res.status(400).json({ error: 'At least email or phoneNumber is required' });
        return;
    }
    try {
        const result = await (0, identifyService_1.resolveContact)({ email, phoneNumber });
        res.status(200).json({ contact: result }); // matches required shape
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ error: message });
    }
}
