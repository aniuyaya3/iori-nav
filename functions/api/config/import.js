// functions/api/config/import.js
import { isAdminAuthenticated, errorResponse, jsonResponse, normalizeSortOrder } from '../../_middleware';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const jsonData = await request.json();
    let categoriesToImport = [];
    let sitesToImport = [];
    let isNewFormat = false;

    // Detect import format
    if (jsonData && typeof jsonData === 'object' && Array.isArray(jsonData.category) && Array.isArray(jsonData.sites)) {
      categoriesToImport = jsonData.category;
      sitesToImport = jsonData.sites;
      isNewFormat = true;
    } else if (Array.isArray(jsonData)) { // Legacy format support
      sitesToImport = jsonData;
    } else {
      return errorResponse('Invalid JSON format. Expected { "category": [...], "sites": [...] } or an array of sites.', 400);
    }

    if (sitesToImport.length === 0) {
      return jsonResponse({ code: 200, message: 'Import successful, but no sites were found to import.' });
    }

    const db = env.NAV_DB;
    const BATCH_SIZE = 100;

    // --- Category Processing ---
    const oldCatIdToNewCatIdMap = new Map();
    const categoryNameToIdMap = new Map();

    // 1. Fetch all existing categories from DB to build a name-to-id map
    const { results: existingDbCategories } = await db.prepare('SELECT id, catelog FROM category').all();
    if (existingDbCategories) {
        existingDbCategories.forEach(c => categoryNameToIdMap.set(c.catelog, c.id));
    }

    if (isNewFormat) {
        // Validate all categories first
        for (const cat of categoriesToImport) {
            if (!cat.catelog || !(cat.catelog.trim())) {
                return errorResponse("导入失败：分类数据中存在无效条目，缺少 'catelog' 名称。", 400);
            }
        }

        // New format: Process categories from the dedicated `category` array
        const newCategoryInserts = [];
        const newCategoryNames = new Set();

        for (const cat of categoriesToImport) {
            const catName = (cat.catelog || '').trim();
            if (catName && !categoryNameToIdMap.has(catName)) {
                const sortOrder = normalizeSortOrder(cat.sort_order);
                newCategoryInserts.push(db.prepare('INSERT INTO category (catelog, sort_order) VALUES (?, ?)').bind(catName, sortOrder));
                newCategoryNames.add(catName);
                categoryNameToIdMap.set(catName, null); // Placeholder to avoid duplicate inserts
            }
        }

        // Batch insert all new categories
        if (newCategoryInserts.length > 0) {
            await db.batch(newCategoryInserts);
            // Fetch the newly created category IDs
            const placeholders = Array.from(newCategoryNames).map(() => '?').join(',');
            const { results: newDbCategories } = await db.prepare(`SELECT id, catelog FROM category WHERE catelog IN (${placeholders})`).bind(...newCategoryNames).all();
            if (newDbCategories) {
                newDbCategories.forEach(c => categoryNameToIdMap.set(c.catelog, c.id));
            }
        }

        // Create the mapping from the old category ID (in file) to the new/existing ID (in DB)
        for (const cat of categoriesToImport) {
            const catName = (cat.catelog || '').trim();
            if (catName && categoryNameToIdMap.has(catName)) {
                oldCatIdToNewCatIdMap.set(cat.id, categoryNameToIdMap.get(catName));
            }
        }
    } else {
        // Legacy format: Extract categories from the sites array itself
        const defaultCategory = 'Default';
        const categoryNames = [...new Set(sitesToImport.map(item => (item.catelog || defaultCategory).trim()))].filter(name => name);
        const newCategoryNames = categoryNames.filter(name => !categoryNameToIdMap.has(name));

        if (newCategoryNames.length > 0) {
            const insertStmts = newCategoryNames.map(name => db.prepare('INSERT INTO category (catelog) VALUES (?)').bind(name));
            await db.batch(insertStmts);
            
            // Fetch new IDs in batches
            for (let i = 0; i < newCategoryNames.length; i += BATCH_SIZE) {
                const chunk = newCategoryNames.slice(i, i + BATCH_SIZE);
                const placeholders = chunk.map(() => '?').join(',');
                const { results: newCategories } = await db.prepare(`SELECT id, catelog FROM category WHERE catelog IN (${placeholders})`).bind(...chunk).all();
                if (newCategories) {
                    newCategories.forEach(c => categoryNameToIdMap.set(c.catelog, c.id));
                }
            }
        }
    }

    // --- Site Processing ---
    // 1. Get all URLs from the import list to check for existence in one go
    const siteUrls = sitesToImport.map(item => (item.url || '').trim()).filter(url => url);
    const existingSiteUrls = new Set();
    if (siteUrls.length > 0) {
        for (let i = 0; i < siteUrls.length; i += BATCH_SIZE) {
            const chunk = siteUrls.slice(i, i + BATCH_SIZE);
            const placeholders = chunk.map(() => '?').join(',');
            const { results: existingSites } = await db.prepare(`SELECT url FROM sites WHERE url IN (${placeholders})`).bind(...chunk).all();
            if (existingSites) {
                existingSites.forEach(site => existingSiteUrls.add(site.url));
            }
        }
    }

    const siteInsertStmts = [];
    let itemsAdded = 0;
    let itemsSkipped = 0;
    const iconAPI = env.ICON_API || 'https://favicon.im/';

    for (const site of sitesToImport) {
        const sanitizedUrl = (site.url || '').trim();
        const sanitizedName = (site.name || '').trim();

        // Stricter validation: skip if essential fields are missing
        if (!sanitizedUrl || !sanitizedName) {
            itemsSkipped++;
            continue;
        }
        if (isNewFormat && (site.catelog_id === undefined || site.catelog_id === null)) {
            itemsSkipped++;
            continue; // Skip if catelog_id is missing in new format
        }

        // If URL already exists, skip this item as requested
        if (existingSiteUrls.has(sanitizedUrl)) {
            itemsSkipped++;
            continue;
        }

        let newCatId;
        if (isNewFormat) {
            // Map category using the old ID from the file
            newCatId = oldCatIdToNewCatIdMap.get(site.catelog_id);
        } else {
            // Map category by name for legacy format
            const catName = (site.catelog || 'Default').trim();
            newCatId = categoryNameToIdMap.get(catName);
        }

        // If category could not be mapped, skip the site
        if (!newCatId) {
            itemsSkipped++;
            continue;
        }

        // Auto-generate logo if it's missing
        let sanitizedLogo = (site.logo || '').trim() || null;
        if (!sanitizedLogo && sanitizedUrl.startsWith('http')) {
            const domain = sanitizedUrl.replace(/^https?:\/\//, '').split('/')[0];
            sanitizedLogo = `${iconAPI}${domain}${!env.ICON_API ? '?larger=true' : ''}`;
        }

        const sanitizedDesc = (site.desc || '').trim() || null;
        const sortOrderValue = normalizeSortOrder(site.sort_order);

        siteInsertStmts.push(
            db.prepare('INSERT INTO sites (name, url, logo, desc, catelog_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
              .bind(sanitizedName, sanitizedUrl, sanitizedLogo, sanitizedDesc, newCatId, sortOrderValue)
        );
        itemsAdded++;
    }

    // Batch insert all new sites
    if (siteInsertStmts.length > 0) {
        await db.batch(siteInsertStmts);
    }

    return jsonResponse({
        code: 201,
        message: `导入完成。成功添加 ${itemsAdded} 个书签，跳过 ${itemsSkipped} 个（已存在或数据不完整）。`
    }, 201);

  } catch (error) {
    return errorResponse(`Failed to import config: ${error.message}`, 500);
  }
}
