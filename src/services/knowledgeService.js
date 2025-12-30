/**
 * Knowledge Service
 * Handles all knowledge base operations: folders, articles, tags, and search
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Helper function to handle IPC responses
 */
async function dbQuery(sql, params = []) {
  const result = await window.electronAPI.dbQuery(sql, params);
  if (!result.success) {
    throw new Error(result.error || 'Database query failed');
  }
  return result.data;
}

async function dbRun(sql, params = []) {
  const result = await window.electronAPI.dbRun(sql, params);
  if (!result.success) {
    throw new Error(result.error || 'Database operation failed');
  }
  return result;
}

/**
 * Folder Operations
 */

export async function getAllFolders() {
  if (!window.electronAPI?.dbQuery) {
    throw new Error('Database not available');
  }

  const folders = await dbQuery(
    'SELECT * FROM knowledge_folders ORDER BY sort_order, name'
  );

  // Build folder tree structure
  return buildFolderTree(folders);
}

export async function createFolder(name, parentId = null) {
  if (!window.electronAPI?.dbRun) {
    throw new Error('Database not available');
  }

  const id = uuidv4();
  await dbRun(
    `INSERT INTO knowledge_folders (id, parent_id, name, sort_order)
     VALUES (?, ?, ?, 0)`,
    [id, parentId, name]
  );

  return { id, parent_id: parentId, name, sort_order: 0 };
}

export async function updateFolder(id, updates) {
  if (!window.electronAPI?.dbRun) {
    throw new Error('Database not available');
  }

  const { name, parent_id, sort_order } = updates;
  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }
  if (parent_id !== undefined) {
    fields.push('parent_id = ?');
    values.push(parent_id);
  }
  if (sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(sort_order);
  }

  values.push(id);

  await dbRun(
    `UPDATE knowledge_folders SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteFolder(id) {
  if (!window.electronAPI?.dbRun) {
    throw new Error('Database not available');
  }

  // Check if folder has children
  const children = await dbQuery(
    'SELECT COUNT(*) as count FROM knowledge_folders WHERE parent_id = ?',
    [id]
  );

  if (children[0].count > 0) {
    throw new Error('Cannot delete folder with subfolders. Delete children first.');
  }

  // Check if folder has articles
  const articles = await dbQuery(
    'SELECT COUNT(*) as count FROM knowledge_articles WHERE folder_id = ?',
    [id]
  );

  if (articles[0].count > 0) {
    throw new Error('Cannot delete folder with articles. Move or delete articles first.');
  }

  await dbRun(
    'DELETE FROM knowledge_folders WHERE id = ?',
    [id]
  );
}

/**
 * Article Operations
 */

export async function getAllArticles(folderId = null) {
  if (!window.electronAPI?.dbQuery) {
    throw new Error('Database not available');
  }

  let query = `
    SELECT a.*, f.name as folder_name
    FROM knowledge_articles a
    LEFT JOIN knowledge_folders f ON a.folder_id = f.id
  `;

  const params = [];

  if (folderId) {
    query += ' WHERE a.folder_id = ?';
    params.push(folderId);
  }

  query += ' ORDER BY a.updated_at DESC';

  const articles = await dbQuery(query, params);

  // Parse tags JSON
  return articles.map(article => ({
    ...article,
    tags: article.tags ? JSON.parse(article.tags) : [],
    is_spark: Boolean(article.is_spark)
  }));
}

export async function getArticle(id) {
  if (!window.electronAPI?.dbQuery) {
    throw new Error('Database not available');
  }

  const articles = await dbQuery(
    `SELECT a.*, f.name as folder_name
     FROM knowledge_articles a
     LEFT JOIN knowledge_folders f ON a.folder_id = f.id
     WHERE a.id = ?`,
    [id]
  );

  if (articles.length === 0) {
    throw new Error('Article not found');
  }

  const article = articles[0];
  return {
    ...article,
    tags: article.tags ? JSON.parse(article.tags) : [],
    is_spark: Boolean(article.is_spark)
  };
}

export async function createArticle(articleData) {
  if (!window.electronAPI?.dbRun) {
    throw new Error('Database not available');
  }

  const {
    folder_id,
    title,
    content = '',
    source_url = null,
    tags = [],
    is_spark = false
  } = articleData;

  const id = uuidv4();
  const tagsJson = JSON.stringify(tags);

  await dbRun(
    `INSERT INTO knowledge_articles
     (id, folder_id, title, content, source_url, tags, is_spark, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [id, folder_id, title, content, source_url, tagsJson, is_spark ? 1 : 0]
  );

  return {
    id,
    folder_id,
    title,
    content,
    source_url,
    tags,
    is_spark,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function updateArticle(id, updates) {
  if (!window.electronAPI?.dbRun) {
    throw new Error('Database not available');
  }

  const {
    folder_id,
    title,
    content,
    source_url,
    tags,
    is_spark
  } = updates;

  const fields = [];
  const values = [];

  if (folder_id !== undefined) {
    fields.push('folder_id = ?');
    values.push(folder_id);
  }
  if (title !== undefined) {
    fields.push('title = ?');
    values.push(title);
  }
  if (content !== undefined) {
    fields.push('content = ?');
    values.push(content);
  }
  if (source_url !== undefined) {
    fields.push('source_url = ?');
    values.push(source_url);
  }
  if (tags !== undefined) {
    fields.push('tags = ?');
    values.push(JSON.stringify(tags));
  }
  if (is_spark !== undefined) {
    fields.push('is_spark = ?');
    values.push(is_spark ? 1 : 0);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await dbRun(
    `UPDATE knowledge_articles SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteArticle(id) {
  if (!window.electronAPI?.dbRun) {
    throw new Error('Database not available');
  }

  await dbRun(
    'DELETE FROM knowledge_articles WHERE id = ?',
    [id]
  );
}

/**
 * Search Operations
 */

export async function searchArticles(query) {
  if (!window.electronAPI?.dbQuery) {
    throw new Error('Database not available');
  }

  const searchPattern = `%${query}%`;

  const articles = await dbQuery(
    `SELECT a.*, f.name as folder_name
     FROM knowledge_articles a
     LEFT JOIN knowledge_folders f ON a.folder_id = f.id
     WHERE a.title LIKE ? OR a.content LIKE ? OR a.tags LIKE ?
     ORDER BY a.updated_at DESC
     LIMIT 50`,
    [searchPattern, searchPattern, searchPattern]
  );

  return articles.map(article => ({
    ...article,
    tags: article.tags ? JSON.parse(article.tags) : [],
    is_spark: Boolean(article.is_spark)
  }));
}

export async function getArticlesByTag(tag) {
  if (!window.electronAPI?.dbQuery) {
    throw new Error('Database not available');
  }

  const articles = await dbQuery(
    `SELECT a.*, f.name as folder_name
     FROM knowledge_articles a
     LEFT JOIN knowledge_folders f ON a.folder_id = f.id
     WHERE a.tags LIKE ?
     ORDER BY a.updated_at DESC`,
    [`%"${tag}"%`]
  );

  return articles.map(article => ({
    ...article,
    tags: article.tags ? JSON.parse(article.tags) : [],
    is_spark: Boolean(article.is_spark)
  }));
}

/**
 * Spark Operations
 */

export async function getSparks() {
  if (!window.electronAPI?.dbQuery) {
    throw new Error('Database not available');
  }

  const sparks = await dbQuery(
    `SELECT a.*, f.name as folder_name
     FROM knowledge_articles a
     LEFT JOIN knowledge_folders f ON a.folder_id = f.id
     WHERE a.is_spark = 1
     ORDER BY a.created_at DESC`
  );

  return sparks.map(spark => ({
    ...spark,
    tags: spark.tags ? JSON.parse(spark.tags) : [],
    is_spark: true
  }));
}

export async function promoteSparkToArticle(sparkId, folderId) {
  if (!window.electronAPI?.dbRun) {
    throw new Error('Database not available');
  }

  await dbRun(
    `UPDATE knowledge_articles
     SET is_spark = 0, folder_id = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [folderId, sparkId]
  );
}

/**
 * Tag Operations
 */

export async function getAllTags() {
  if (!window.electronAPI?.dbQuery) {
    throw new Error('Database not available');
  }

  const articles = await dbQuery(
    "SELECT tags FROM knowledge_articles WHERE tags IS NOT NULL AND tags != '[]'"
  );

  const tagSet = new Set();
  articles.forEach(article => {
    if (article.tags) {
      try {
        const tags = JSON.parse(article.tags);
        tags.forEach(tag => tagSet.add(tag));
      } catch (e) {
        console.error('Failed to parse tags:', article.tags);
      }
    }
  });

  return Array.from(tagSet).sort();
}

/**
 * Helper Functions
 */

function buildFolderTree(folders) {
  const folderMap = new Map();
  const rootFolders = [];

  // Create map of all folders
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  // Build tree structure
  folders.forEach(folder => {
    const folderNode = folderMap.get(folder.id);
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id);
      if (parent) {
        parent.children.push(folderNode);
      } else {
        // Parent not found, add to root
        rootFolders.push(folderNode);
      }
    } else {
      rootFolders.push(folderNode);
    }
  });

  return rootFolders;
}

/**
 * Initialize default folders if database is empty
 */
export async function initializeDefaultFolders() {
  if (!window.electronAPI?.dbQuery || !window.electronAPI?.dbRun) {
    return;
  }

  try {
    const folders = await dbQuery(
      'SELECT COUNT(*) as count FROM knowledge_folders'
    );

    if (folders[0].count === 0) {
      console.log('[KnowledgeService] Initializing default folders...');

      const defaultFolders = [
        'Articles',
        'Code Snippets',
        'Content Ideas',
        'Courses',
        'Frameworks',
        'Newsletters',
        'Research',
        'Resources',
        'Social Media',
        'SparkFile',
        'Stories',
        'Tools',
        'Transcripts'
      ];

      for (let i = 0; i < defaultFolders.length; i++) {
        await createFolder(defaultFolders[i], null);
      }

      console.log('[KnowledgeService] Default folders created');
    }
  } catch (error) {
    console.error('[KnowledgeService] Failed to initialize default folders:', error);
  }
}

// Export as a service object for consistency with other services
export const knowledgeService = {
  getAllFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  getAllArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  searchArticles,
  getArticlesByTag,
  getSparks,
  promoteSparkToArticle,
  getAllTags,
  initializeDefaultFolders
};
