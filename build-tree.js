const fs = require('fs');

// قراءة قائمة الملفات التي تم جلبها من Google Drive
const gdriveList = JSON.parse(fs.readFileSync('gdrive_file_list.json', 'utf-8'));

const tree = {};
const map = {};

// الخطوة الأولى: بناء خريطة (map) لجميع العناصر ليسهل الوصول إليها
gdriveList.forEach(file => {
    if (!file) return;
    map[file.id] = {
        name: file.name,
        // إضافة رابط للعرض فقط للملفات (وليس المجلدات)
        link: file.mimeType !== 'application/vnd.google-apps.folder' ? file.webViewLink : null,
        children: {}
    };
});

// الخطوة الثانية: بناء الهيكل الشجري بربط الأبناء بالآباء
gdriveList.forEach(file => {
    if (!file || !file.parents || file.parents.length === 0) {
        // إذا لم يكن للعنصر أب، فهو في الجذر (root)
        if(map[file.id]) {
            tree[file.name] = map[file.id];
        }
        return;
    };

    const parentId = file.parents[0];
    if (map[parentId]) {
        // إذا كان الأب موجوداً في الخريطة، أضف العنصر الحالي كابن له
        if (map[file.id]) {
            map[parentId].children[file.name] = map[file.id];
        }
    } else {
        // إذا لم يكن الأب موجوداً (قد يكون خارج النطاق الممسوح)، اعتبره عنصراً في الجذر
        if (map[file.id]) {
            tree[file.name] = map[file.id];
        }
    }
});

// كتابة الهيكل الشجري النهائي إلى ملف tree_data.json
// استخدام null, 2 لطباعة الملف بشكل منسق وسهل القراءة
fs.writeFileSync('tree_data.json', JSON.stringify(tree, null, 2));

console.log('tree_data.json has been successfully generated!');
