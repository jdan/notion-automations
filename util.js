/**
 * Get all children of a block (paginated)
 */
exports.getAllChildren = async (notion, blockId) => {
  const children = [];
  let start_cursor = undefined;

  do {
    const { results, next_cursor } = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor,
      page_size: 50,
    });

    children.push(...results);
    start_cursor = next_cursor;
  } while (start_cursor !== null);

  return children;
};
