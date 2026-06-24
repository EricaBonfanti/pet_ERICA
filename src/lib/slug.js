export function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateUniqueSlug(base44, name) {
  let slug = generateSlug(name);
  let suffix = 1;
  while (true) {
    const existing = await base44.entities.PetShop.filter({ slug }, '', 1);
    if (existing.length === 0) return slug;
    suffix++;
    slug = `${generateSlug(name)}-${suffix}`;
  }
}