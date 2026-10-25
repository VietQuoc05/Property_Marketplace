export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function matchesSearch(
  fieldValue: string | null | undefined,
  searchKey: string,
): boolean {
  if (!fieldValue || !searchKey) return false;
  const val = fieldValue.toLowerCase();
  const key = searchKey.toLowerCase();
  if (val.includes(key)) return true;
  return removeVietnameseTones(val).includes(removeVietnameseTones(key));
}

/**
 * Returns priority rank for search match:
 * 1: Matches in title
 * 2: Matches in city, district, or ward
 * 3: Matches in description
 * 4: Fallback / other
 */
export function getListingSearchPriority(item: any, searchKey: string): number {
  if (!searchKey) return 4;

  // Priority 1: title
  if (matchesSearch(item.title, searchKey)) {
    return 1;
  }

  // Priority 2: city, district, ward
  if (
    matchesSearch(item.city?.name, searchKey) ||
    matchesSearch(item.district?.name, searchKey) ||
    matchesSearch(item.ward?.name, searchKey)
  ) {
    return 2;
  }

  // Priority 3: description
  if (matchesSearch(item.description, searchKey)) {
    return 3;
  }

  return 4;
}

/**
 * Sorts listings by search priority (1: title, 2: location, 3: description)
 * using a stable sort to preserve existing secondary ordering (e.g. createdAt, price).
 */
export function sortListingsBySearchPriority<T>(listings: T[], searchKey: string): T[] {
  if (!searchKey?.trim()) return listings;
  const key = searchKey.trim();

  return [...listings].sort((a, b) => {
    const priorityA = getListingSearchPriority(a, key);
    const priorityB = getListingSearchPriority(b, key);
    return priorityA - priorityB;
  });
}
