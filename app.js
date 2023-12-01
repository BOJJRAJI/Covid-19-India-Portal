const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());

const dbPath = path.join(__dirname, "./covid19IndiaPortal.db");

let db = null;

const connectDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running On Post 300......");
    });
  } catch (e) {
    console.log(`Error : ${e.message}`);
  }
};

connectDbAndServer();

//verification middleware
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//Login API
app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const dbUserQuery = `SELECT * FROM user where username='${username}';`;
  const dbUser = await db.get(dbUserQuery);
  if (dbUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isPasswordSame = await bcrypt.compare(password, dbUser.password);
    if (isPasswordSame === true) {
      const payLoad = { username: username };
      const jwtToken = await jwt.sign(payLoad, "MY_SECRET_TOKEN");
      console.log(jwtToken);
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

//API2 GET all States
app.get("/states/", authenticateToken, async (req, res) => {
  const dbQuery = `SELECT 
    state_id as stateId,
    state_name as stateName,
    population as population
    FROM state order by state_id;`;
  const dbResponse = await db.all(dbQuery);
  res.send(dbResponse);
});

//API 3 get state based on ID
app.get("/states/:stateId/", authenticateToken, async (req, res) => {
  const { stateId } = req.params;
  const dbQuery = `SELECT 
    state_id as stateId,
    state_name as stateName,
    population as population
    FROM state where state_id=${stateId};`;
  const dbResponse = await db.get(dbQuery);
  res.send(dbResponse);
});

//API 4
app.post("/districts/", authenticateToken, async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  console.log(req.body);
  const dbQuery = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    VALUES(
      '${districtName}',${stateId},${cases},${cured},${active},${deaths}
    )
    ;`;
  await db.run(dbQuery);
  res.send("District Successfully Added");
});

//API 5 get district based on ID
app.get("/districts/:districtId/", authenticateToken, async (req, res) => {
  const { districtId } = req.params;
  const dbQuery = `SELECT 
    district_id as districtId,
    district_name as districtName,
    state_id as stateId,cases,cured,active,deaths
    FROM district where district_id=${districtId};`;
  const dbResponse = await db.get(dbQuery);
  res.send(dbResponse);
});

//API 6 delete district based on ID
app.delete("/districts/:districtId/", authenticateToken, async (req, res) => {
  const { districtId } = req.params;
  const dbQuery = `DELETE  
    FROM district where district_id=${districtId};`;
  await db.run(dbQuery);
  res.send("District Removed");
});

//API 7 update district
app.put("/districts/:districtId/", authenticateToken, async (req, res) => {
  const { districtId } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  console.log(req.body);
  const dbQuery = ` UPDATE district SET 
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured},
      active=${active},
      deaths=${deaths}  
    ;`;
  await db.run(dbQuery);
  res.send("District Details Updated");
});

//API 8
app.get("/states/:stateId/stats/", authenticateToken, async (req, res) => {
  const { stateId } = req.params;
  const getDetailsQuery = `
 SELECT 
 SUM(cases) as  totalCases,
 SUM(cured) AS  totalCured,
 SUM(active) AS    totalActive,
 SUM(deaths) AS   totalDeaths
 FROM 
 district 
 where 
 state_id=${stateId}
 ;`;
  const dbResponse = await db.get(getDetailsQuery);
  res.send(dbResponse);
});

module.exports = app;
