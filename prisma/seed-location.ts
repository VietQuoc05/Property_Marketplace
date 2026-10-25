import { PrismaClient } from '@prisma/client';

import cities from './data/cities.json';
import districts from './data/districts.json';
import wards from './data/wards.json';

const prisma = new PrismaClient();

async function main() {
  await prisma.city.createMany({
    data: cities,
    skipDuplicates: true,
  });

  await prisma.district.createMany({
    data: districts,
    skipDuplicates: true,
  });

  // Migrate any existing listings referencing obsolete/merged wards
  await prisma.listing.updateMany({
    where: { wardId: 'HCM_GO_VAP_P13' },
    data: { wardId: 'HCM_GO_VAP_P14' },
  });

  // Insert all new wards
  await prisma.ward.createMany({
    data: wards,
    skipDuplicates: true,
  });

  // Remove obsolete wards that are no longer in wards.json and not referenced by listings
  const currentWardIds = new Set(wards.map((w) => w.id));
  const existingWards = await prisma.ward.findMany({ select: { id: true } });
  const obsoleteWardIds = existingWards
    .map((w) => w.id)
    .filter((id) => !currentWardIds.has(id));

  if (obsoleteWardIds.length > 0) {
    const deleted = await prisma.ward.deleteMany({
      where: {
        id: { in: obsoleteWardIds },
        listings: { none: {} },
      },
    });
    console.log(`Cleaned up ${deleted.count} obsolete wards.`);
  }

  const cityCount = await prisma.city.count();
  const districtCount = await prisma.district.count();
  const wardCount = await prisma.ward.count();

  console.log(`Location seed completed: ${cityCount} cities, ${districtCount} districts, ${wardCount} wards.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });