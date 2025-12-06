import { z } from 'zod';

// Password validation: min 8 chars, at least 1 uppercase, 1 number
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número');

// Email validation
export const emailSchema = z
  .string()
  .trim()
  .email('Email inválido')
  .max(255, 'Email muito longo');

// Full name validation
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter no mínimo 2 caracteres')
  .max(100, 'Nome muito longo');

// Registration schema
export const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

// Profile schema
export const profileSchema = z.object({
  full_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  birth_date: z.string().optional(),
  institution: z.string().trim().max(200).optional(),
  course: z.string().trim().max(100).optional(),
  semester: z.number().min(1).max(20).optional().nullable(),
  enrollment_number: z.string().trim().max(50).optional(),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
