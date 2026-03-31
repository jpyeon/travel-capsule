import { z } from 'zod';

export const tripSchema = z
  .object({
    destination: z.string().trim().min(1, 'Destination is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    activities: z.array(z.string()).min(1, 'At least one activity is required'),
    vibe: z.enum(['relaxed', 'adventurous', 'formal', 'romantic', 'family', 'backpacker']),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    luggageSize: z.enum(['backpack', 'carry-on', 'checked']),
    hasLaundryAccess: z.boolean(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const tripUpdateSchema = z.object({
  destination: z.string().trim().min(1, 'Destination is required').optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  activities: z.array(z.string()).min(1, 'At least one activity is required').optional(),
  vibe: z.enum(['relaxed', 'adventurous', 'formal', 'romantic', 'family', 'backpacker']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  luggageSize: z.enum(['backpack', 'carry-on', 'checked']).optional(),
  hasLaundryAccess: z.boolean().optional(),
});

export type TripFormData = z.infer<typeof tripSchema>;
export type TripUpdateFormData = z.infer<typeof tripUpdateSchema>;
