import FieldError from 'src/resolvers/FieldError';

export const isProduction = process.env.NODE_ENV === 'production';

export function validSlug(slug: string, field: string = 'slug') {
  const errors: FieldError[] = [];
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    errors.push({ field, message: 'Check the slug is valid' });
  }
  return errors;
}
