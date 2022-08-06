require("dotenv").config({ path: `${__dirname}/.env` });

const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const { getAllChildren } = require("../util");

// https://notes.jordanscales.com/92070f5d
//
// Caption code blocks with `lang=j` for custom syntax highlighting
function shouldCaption(block) {
  return block.type === "code" && block.code.caption.length === 0;
}
function getCaption(block) {
  return [{ type: "text", text: { content: "lang=j" } }];
}

(async () => {
  const children = await getAllChildren(notion, process.env.BLOCK_ID);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (shouldCaption(child)) {
      await notion.blocks.update({
        block_id: child.id,
        code: {
          caption: getCaption(child),
        },
      });
    }
  }
})();
