const fs = require('fs');
const { google } = require('googleapis');

const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;

async function main() {
  console.log('--- STARTING DIAGNOSTIC RUN ---');

  if (!ROOT_FOLDER_ID) {
    console.error('ERROR: ROOT_FOLDER_ID secret is not set!');
    throw new Error('ROOT_FOLDER_ID secret is not set.');
  }
  console.log(`Step 1: Successfully read ROOT_FOLDER_ID = ${ROOT_FOLDER_ID}`);

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  console.log('Step 2: Authentication successful.');
  console.log('Step 3: Now attempting to list files from Google Drive...');

  let fileList = [];
  try {
    const res = await drive.files.list({
      q: `'${ROOT_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, parents, webViewLink)',
      pageSize: 5, // We only need a few files for this test
    });

    console.log('--- RAW API RESPONSE ---');
    console.log(JSON.stringify(res.data, null, 2));
    console.log('--- END RAW API RESPONSE ---');

    if (res.data.files && res.data.files.length > 0) {
        fileList = res.data.files;
    } else {
        console.log('WARNING: The API returned an empty list of files.');
    }

  } catch (e) {
    console.error('FATAL: An error occurred during the API call.');
    console.error(e);
    throw e; // Force the workflow to fail
  }

  console.log(`Step 4: API call finished. Found ${fileList.length} files/folders directly in the root.`);

  // The rest of the script is simplified for this test
  const tree = {};
  fileList.forEach(file => {
      tree[file.name] = { name: file.name, link: file.webViewLink, children: {} };
  });

  fs.writeFileSync('tree_data.json', JSON.stringify(tree, null, 2));
  console.log('Step 5: tree_data.json has been written.');
  console.log('--- DIAGNOSTIC RUN COMPLETE ---');
}

main().catch(error => {
    console.error('Workflow failed in catch block.', error);
    process.exit(1); // Ensure the workflow fails loudly
});
