const fs = require('fs');
const { google } = require('googleapis');

// جلب معرّف المجلد الرئيسي من الـ Secrets عبر متغيرات البيئة
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;

async function main() {
  console.log('Starting Google Drive sync...');

  if (!ROOT_FOLDER_ID) {
    throw new Error('ROOT_FOLDER_ID secret is not set.');
  }

  // المصادقة التلقائية باستخدام حساب الخدمة الذي تم تفعيله في الخطوة الأولى من الـ Workflow
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  console.log('Successfully authenticated. Fetching file list...');

  // دالة تكرارية لجلب جميع الملفات والمجلدات
  async function getAllFiles(folderId) {
    let allFiles = [];
    let pageToken = null;
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name, mimeType, parents, webViewLink)',
        pageToken: pageToken,
        pageSize: 1000, // جلب 1000 ملف في كل طلب
      });

      const files = res.data.files;
      if (files.length) {
        for (const file of files) {
          allFiles.push(file);
          // إذا كان العنصر مجلداً، قم بجلب محتوياته أيضاً
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
  console.log(`Fetched a total of ${fileList.length} files and folders.`);

  // --- نفس منطق بناء الشجرة من قبل ---
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
  // --- نهاية منطق بناء الشجرة ---

  fs.writeFileSync('tree_data.json', JSON.stringify(tree, null, 2));
  console.log('✅ tree_data.json has been successfully generated!');
}

main().catch(console.error);
