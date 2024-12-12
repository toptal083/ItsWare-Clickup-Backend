const express = require("express");
const fetch = require("node-fetch");
const app = express();

const CLIENT_ID = "OYII8UYZZZMAZX78AHNOXJRJJ8IZHU9S";
const CLIENT_SECRET =
  "2E0JMH3LT3AZOGL1AIQ1WXC1CF2KE70T3P7K8F2E7O3MGVKXBTOXZL6QW85O2TIL";
const REDIRECT_URI = "http://localhost:3000/callback";

// Temporary in-memory storage for access token (Use database for production)
let accessTokens = {};

const deviceList = [
  {
    id: 1,
    name: "Surface Pro",
    cabinet: "Main Cabinet",
  },
  {
    id: 2,
    name: "Macbook Pro",
    cabinet: "Main Cabinet",
  },
  {
    id: 3,
    name: "Dell XPS",
    cabinet: "Main Cabinet",
  },
  {
    id: 4,
    name: "Lenovo Thinkpad",
    cabinet: "Main Cabinet",
  },
  {
    id: 5,
    name: "HP Elitebook",
    cabinet: "Main Cabinet",
  },
  {
    id: 6,
    name: "Surface Pro 2",
    cabinet: "Main Cabinet",
  },
  {
    id: 7,
    name: "Macbook Pro 2",
    cabinet: "Secondary Cabinet",
  },
  {
    id: 8,
    name: "Dell XPS 2",
    cabinet: "Secondary Cabinet",
  },
  {
    id: 9,
    name: "Lenovo Thinkpad 2",
    cabinet: "Secondary Cabinet",
  },
  {
    id: 10,
    name: "HP Elitebook 2",
    cabinet: "Secondary Cabinet",
  },
  {
    id: 11,
    name: "Surface Pro 3",
    cabinet: "Secondary Cabinet",
  },
  {
    id: 12,
    name: "Macbook Pro 3",
    cabinet: "Secondary Cabinet",
  },
];

app.get("/auth", (req, res) => {
  const { extensionId } = req.query;

  if (!extensionId) {
    return res.status(400).send("Extension ID is missing.");
  }

  const authUrl = `https://app.clickup.com/api?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${extensionId}`;
  res.redirect(authUrl); // Redirects the user to ClickUp's OAuth page
});

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code missing");
  }

  if (!state) {
    return res.status(400).send("State (extension ID) is missing.");
  }

  try {
    const response = await fetch("https://api.clickup.com/api/v2/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).send(data.error);
    }

    const accessToken = data.access_token;
    accessTokens[state] = accessToken; // Store access token temporarily

    console.log(`Access token for extension ${state}: ${accessToken}`);
    const redirectUrl = `https://${state}.chromiumapp.org?access_token=${accessToken}`;
    res.redirect(redirectUrl);
  } catch (error) {
    return res.status(500).send("Error exchanging auth code for access token");
  }
});

// Endpoint to fetch current workspace information
app.get("/workspace", async (req, res) => {
  const { extensionId } = req.query;

  if (!extensionId || !accessTokens[extensionId]) {
    return res
      .status(400)
      .send("No access token found or extension ID is missing.");
  }

  const accessToken = accessTokens[extensionId];

  try {
    const response = await fetch("https://api.clickup.com/api/v2/team", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const workspaceData = await response.json();

    console.log(workspaceData.teams[0], "workspaceData");
    if (workspaceData.error) {
      return res.status(400).send(workspaceData.error);
    }

    res.json(workspaceData.teams[0]); // Return workspace info
  } catch (error) {
    return res.status(500).send("Error fetching workspace data");
  }
});

let taskDeviceAssociations = {}; // Store task-device associations

// Endpoint to fetch associated devices for a task
app.get("/deviceList", (req, res) => {
  const { taskId } = req.query;

  if (!taskId) {
    return res.status(400).send("Task ID is missing.");
  }

  // Fetch the associated devices for the given taskId
  const associatedDevices = taskDeviceAssociations[taskId] || [];
  res.json(associatedDevices);
});

// Endpoint to update the device list for a task
app.post("/updateDeviceList", (req, res) => {
  const { taskId, deviceId, isWatching } = req.body;

  if (!taskId || !deviceId || typeof isWatching === 'undefined') {
    return res.status(400).send("Missing taskId, deviceId, or isWatching.");
  }

  // Update the association in the taskDeviceAssociations object
  if (!taskDeviceAssociations[taskId]) {
    taskDeviceAssociations[taskId] = []; // Initialize the task's device list if not already
  }

  if (isWatching) {
    // Add the device to the task if it's being associated
    if (!taskDeviceAssociations[taskId].includes(deviceId)) {
      taskDeviceAssociations[taskId].push(deviceId);
    }
  } else {
    // Remove the device from the task if it's being disassociated
    taskDeviceAssociations[taskId] = taskDeviceAssociations[taskId].filter(
      (id) => id !== deviceId
    );
  }

  res.json({ success: true, taskDeviceAssociations: taskDeviceAssociations[taskId] });
});


// Start the backend server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
