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

export function validUrl(url: string, field: string): FieldError[] {
  const result: FieldError[] = [];
  const urlRegex =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,7}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  if (!urlRegex.test(url)) {
    result.push({ field, message: 'Check this is a valid url' });
  }
  return result;
}
