## twitter-followers

Sync your Twitter followers to Notion

### setup

Create a `.env` file in this directory with the following:

```
TWITTER_BEARER_TOKEN=
NOTION_API_KEY=
NOTION_DATABASE_ID=
```

### setup twitter

1. [Create a new Twitter app](https://developer.twitter.com/en/portal/apps/new)

![image](https://user-images.githubusercontent.com/287268/166120229-371ddb64-c675-4d50-a76b-d704335c9ee5.png)

2. Save the bearer token in your newly-created `.env` file

### setup notion

3. Create a Notion integration ([detailed instructions](https://developers.notion.com/docs/getting-started))
4. Save the newly-created integration token as `NOTION_API_KEY`
5. Create a Notion database with the following schema (TODO: create a small cli to bootstrap this)

![image](https://user-images.githubusercontent.com/287268/166120282-4ad80b9f-ba02-4d28-9235-0972311f5d77.png)

- Name (title)
- Display name (text)
- Bio (text)
- Location (text)
- Followers (number)
- Following (number)
- ID (text)

6. Share the database with your new integration
7. Copy the database ID and set it to `NOTION_DATABASE_ID`

### run

```sh
node twitter-followers.js
```

and wait forever. twitter rate limits are WILD so the script will sleep occasionally.
