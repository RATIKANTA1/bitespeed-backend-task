import { Request, Response } from 'express';
import { z } from 'zod';
import { resolveContact } from '../services/identifyService';

const InputSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
});

export async function identifyContact(req: Request, res: Response): Promise<void> {
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
    const result = await resolveContact({ email, phoneNumber });
    res.status(200).json({ contact: result }); // matches required shape
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
