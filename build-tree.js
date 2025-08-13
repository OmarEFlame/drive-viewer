const fs = require('fs');
const { google } = require('googleapis');

const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;

async function main() {
  if (!ROOT_FOLDER_ID) {
    throw new Error('ROOT_FOLDER_ID secret is not set.');
  }

  // الآن سيتم العثور على الصلاحيات تلقائياً بفضل التعديل في ملف الـ yml
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  // دالة تكرارية لجلب جميع الملفات والمجلدات
  async function getAllFiles(folderId) {
    let allFiles = [];
    let pageToken = null;
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name, mimeType, parents, webViewLink)',
        pageToken: pageToken,
        pageSize: 1000,
      });

      const files = res.data.files;
      if (files.length) {
        for (const file of files) {
          allFiles.push(file);
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            const subFiles = await getAllFiles(file.id);
            allFiles = allFiles.concat(subFiles);
          }
        }
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
    return allFiles;
  }

  const fileList = await getAllFiles(ROOT_FOLDER_ID);

  const tree = {};
  const map = {};

  fileList.forEach(file => {
    if (!file) return;
    map[file.id] = {
      name: file.name,
      link: file.mimeType !== 'application/vnd.google-apps.folder' ? file.webViewLink : null,
      children: {},
    };
  });

  fileList.forEach(file => {
    if (!file || !file.parents || file.parents.length === 0 || file.parents[0] === ROOT_FOLDER_ID) {
      if (map[file.id]) {
        tree[file.name] = map[file.id];
      }
      return;
    }

    const parentId = file.parents[0];
    if (map[parentId]) {
      if (map[file.id]) {
        map[parentId].children[file.name] = map[file.id];
      }
    } else {
       if (map[file.id]) {
        tree[file.name] = map[file.id];
       }
    }
  });

  fs.writeFileSync('tree_data.json', JSON.stringify(tree, null, 2));
  console.log(`Successfully generated tree_data.json with ${fileList.length} items.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
