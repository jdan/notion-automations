require("dotenv").config({ path: `${__dirname}/.env`});
const fs = require("fs");

const Twitter = require("twitter");
const client = new Twitter({
  bearer_token: process.env.TWITTER_BEARER_TOKEN,
});

const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_API_KEY });

function twitterClientGet(endpoint, args) {
  return new Promise((resolve, reject) => {
    client.get(endpoint, args, (err, res) => {
      if (err) {
        return reject(err);
      }

      return resolve(res);
    });
  });
}

async function getFollowers() {
  let cursor = -1;
  const followers = [];

  do {
    try {
      const res = await twitterClientGet("followers/list.json", {
        screen_name: "jdan",
        count: 200,
        skip_status: true,
        cursor,
      });

      cursor = res.next_cursor;
      followers.push(...res.users);
      console.log(`Loaded ${followers.length} followers`);
    } catch (e) {
      console.log(e);
      console.log("Sleeping for 5 min...");
      await new Promise((resolve) => {
        setTimeout(resolve, 5 * 60 * 1000);
      });
    }
  } while (cursor !== 0);

  return followers;
}

function richTextToString(arr) {
  if (arr) {
    return arr.map((i) => i.text.content).join("");
  } else {
    return "";
  }
}

function stringToRichText(content) {
  return [
    {
      type: "text",
      text: {
        content,
      },
    },
  ];
}

function twitterFollowerToNotionSchema(follower) {
  return {
    Name: {
      title: stringToRichText(follower.screen_name),
    },
    ID: {
      rich_text: stringToRichText(follower.id_str),
    },
    "Display name": {
      rich_text: stringToRichText(follower.name),
    },
    Bio: {
      rich_text: stringToRichText(follower.description),
    },
    Location: {
      rich_text: stringToRichText(follower.location),
    },
    Following: {
      number: follower.friends_count,
    },
    Followers: {
      number: follower.followers_count,
    },
    URL: {
      url: `https://twitter.com/${follower.screen_name}`
    }
  };
}

function notionPropertiesToUpdate(notionRecord, follower) {
  const followerAsNotionSchema = twitterFollowerToNotionSchema(follower);

  function richTextDiffers(fieldName) {
    return (
      richTextToString(notionRecord[fieldName].rich_text) !==
      richTextToString(followerAsNotionSchema[fieldName].rich_text)
    );
  }

  function getUpdate(fieldName) {
    if (notionRecord[fieldName].type === "title") {
      const titleDiffers =
        richTextToString(notionRecord[fieldName].title) !==
        richTextToString(followerAsNotionSchema[fieldName].title);
      return titleDiffers
        ? { [fieldName]: followerAsNotionSchema[fieldName] }
        : null;
    } else if (notionRecord[fieldName].type === "rich_text") {
      return richTextDiffers(fieldName)
        ? { [fieldName]: followerAsNotionSchema[fieldName] }
        : null;
    } else if (notionRecord[fieldName].type === "number") {
      return notionRecord[fieldName].number !==
        followerAsNotionSchema[fieldName].number
        ? { [fieldName]: followerAsNotionSchema[fieldName] }
        : null;
    }  else if (notionRecord[fieldName].type === "url") {
      return notionRecord[fieldName].url !==
        followerAsNotionSchema[fieldName].url
        ? { [fieldName]: followerAsNotionSchema[fieldName] }
        : null;
    }
  }

  return {
    ...getUpdate("ID"),
    ...getUpdate("Name"),
    ...getUpdate("Display name"),
    ...getUpdate("Bio"),
    ...getUpdate("Location"),
    ...getUpdate("URL"),
    // Let's pause updating following/followers for now
    // ...getUpdate("Following"),
    // ...getUpdate("Followers"),
  };
}

async function upsertFollowersDB(followers) {
  let cursor = undefined;
  const followersByTwitterId = {};

  do {
    const { results, next_cursor } = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    });

    results.forEach(({ id, properties }) => {
      const twitterId = richTextToString(properties["ID"].rich_text);
      followersByTwitterId[twitterId] = { ...properties, page_id: id };
    });

    cursor = next_cursor;

    console.log(
      `Loaded ${Object.keys(followersByTwitterId).length} existing followers...`
    );
  } while (cursor !== null);

  console.log("Complete!");

  const toCreate = [];
  const toUpdate = [];
  // const toDelete = [];

  followers.forEach((follower) => {
    if (!followersByTwitterId[follower.id_str]) {
      toCreate.push(follower);
    } else {
      const notionFollower = followersByTwitterId[follower.id_str];
      const propertiesToUpdate = notionPropertiesToUpdate(
        notionFollower,
        follower
      );

      if (Object.keys(propertiesToUpdate).length) {
        toUpdate.push({
          page_id: notionFollower.page_id,
          properties: propertiesToUpdate,
        });
      }
    }
  });

  // Create
  console.log(`Creating ${toCreate.length} new entries...`);
  for (const follower of toCreate) {
    const properties = twitterFollowerToNotionSchema(follower);
    while (true) {
      try {
        await notion.pages.create({
          parent: {
            database_id: process.env.NOTION_DATABASE_ID,
          },
          properties,
        });
        break;
      } catch (e) {
        console.log("Errored out, retrying...");
      }
    }
  }

  // Update
  console.log(`Updating ${toUpdate.length} entries...`);
  for (const { page_id, properties } of toUpdate) {
    while (true) {
      try {
        await notion.pages.update({
          page_id,
          properties,
        });
        break;
      } catch (e) {
        console.log("Errored out, retrying...");
      }
    }
  }
}

(async () => {
  try {
    const followers = await getFollowers();
    fs.writeFileSync(
      `${__dirname}/followers-${new Date().getTime()}.json`,
      JSON.stringify(followers)
    );
    // const followers = require("./followers-1651397425723.json");
    await upsertFollowersDB(followers);
  } catch (e) {
    console.log(e);
  }
})();
