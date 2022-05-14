require("dotenv").config({ path: `${__dirname}/.env` });

const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function getAllItems(databaseId) {
  const allItems = [];
  let cursor = undefined;

  do {
    const { results, next_cursor } = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    allItems.push(...results);
    console.log(`Loaded ${allItems.length} items...`);

    cursor = next_cursor;
  } while (cursor !== null);

  return allItems;
}

function richTextToString(arr) {
  if (arr) {
    return arr.map((i) => i.text.content).join("");
  } else {
    return "";
  }
}

function uniquify(items, getId) {
  const uniquePages = {};
  items.forEach((item) => {
    const id = getId(item);

    if (!uniquePages[id]) {
      uniquePages[id] = item;
    }
  });
  return new Set(Object.values(uniquePages).map(({ id }) => id));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const items = await getAllItems(process.env.NOTION_DATABASE_ID);
  const uniquePagesByName = uniquify(items, (item) =>
    richTextToString(item.properties["Name"].title)
  );

  for (let { id } of items) {
    if (!uniquePagesByName.has(id)) {
      console.log(`Deleting duplicate page with id = ${id}`);
      while (true) {
        try {
          await notion.pages.update({
            page_id: id,
            archived: true,
          });
          break;
        } catch (e) {
          console.log("Errored out deleting, retrying...");
          await sleep(1000);
        }
      }
    }
  }
}

(async () => {
  run();
})();
