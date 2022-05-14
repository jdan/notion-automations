## remove-duplicates

A work-in-process script to automate the task of removing duplicate entries from a Notion database.

See `remove-duplicates.js` for an example of removing elements with duplicate "Name" values. This is not customizable with config currently.

### setup notion

1. Create a Notion integration ([detailed instructions](https://developers.notion.com/docs/getting-started))
2. Save the newly-created integration token as `NOTION_API_KEY`
3. Share the database with your new integration
4. Copy the database ID and set it to `NOTION_DATABASE_ID`

### run

```sh
NOTION_API_KEY=... NOTION_DATABASE_ID=... node remove-duplicates.js
# alternatively, place the variables in a `.env`
# file in this directory
```