const express = require("express");
const app = express();
const port = 3001;
const axios = require("axios");
const { reward, tier } = require("./helpers/reward");
const bcrypt = require("bcryptjs");

app.use(express.urlencoded({extended: true}));
app.use(express.json());

// Get all initator data
app.get("/initiators", async (req, res) => {
    try {
        const { data } = await axios.get("http://localhost:3000/initiator")
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Get all participant data
app.get("/participants", async (req, res) => {
    try {
        const { data } = await axios.get("http://localhost:3000/participant")
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Get all admin data
app.get("/admins", async (req, res) => {
    try {
        const { data } = await axios.get("http://localhost:3000/admin")
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Get All Challenge Data
app.get("/challenges", async (req, res) => {
    try {
        const { data } = await axios.get("http://localhost:3000/challenge")
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Get Challenges by id
app.get("/challenges/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {data} = await axios.get("http://localhost:3000/challenge/" + id);
        res.status(200).json(data);
    } catch (error) {
            res.status(500).json({message: "Internal Server Error"});
    }
})

// Calculate reward challenge
app.get("/challenges/sum/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let sumReward =  0;
        const { data } = await axios.get("http://localhost:3000/challenge/" + id)
        if (!data) throw { name: "notFound" }
        data.submission.forEach(el => {
            el.status === "Approved" ? sumReward += reward(el.views) : null
        });
        
        // Update total budget for reward from field challenges
        await axios("http://localhost:3000/challenge/" + id, {
            method: "put",
            data: {
                name: data.name,
                budget: data.budget,
                rewardBudget: sumReward,
                submission: data.submission
            }
        })
        res.status(200).json({
            challenge: data.name,
            totalReward: sumReward
        })
    } catch (error) {
            res.status(500).json({message: "Internal Server Error"});
    }
})

// Get Submission data by id
app.get("/participants/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const  { data } = await axios.get("http://localhost:3000/participant/" + id);
        res.status(200).json({
            status: data.status,
            views: data.views,
            tier: `${tier(data.views)}`,
            reward: `${reward(data.views)}`
        })
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Post Submission to challenge
app.put("/participants/subs/:id", async (req, res) => {
    try {
        const participantId = 11;
        const { id } = req.params;
        const { data: participant } = await axios.get("http://localhost:3000/participant/" + participantId);
        const { data: challenge } = await axios.get("http://localhost:3000/challenge/" + id);
        
        if (challenge.budget <= challenge.reward || challenge.duedate < new Date()) {
            return {name: "limit"}
        }
        let found = false;
        challenge.submission.forEach(el => {
            el.id == participantId ? found = true : false;
        })
        if (found) return {name: "enrolled"};

        const submission = challenge.submission.push(participant);
        await axios("http://localhost:3000/challenge/" + id), {
            method: "put",
            data: {
                InitiatorId: challenge.InitiatorId,
                name: challenge.name,
                duedate: challenge.duedate,
                budget: challenge.budget,
                rewardBudget: challenge.rewardBudget,
                submission
            }
        }
        res.status(200).json({message: "success add new submission"})
    } catch (error) {
        switch (error.name) {
            case "limit":
                res.status(400).json({message: "challenge closed"})
                break;
            case "limit":
                res.status(400).json({message: "already enrolled"})
                break;
            default:
                res.status(500).json({message: "Internal Server Error"});
                break;
        }
    }
})

// Register New Admin
app.post("/admins", async (req, res) => {
    try {
        const { username, password } = req.body;
        const cryptPassword = bcrypt.hashSync(password, 10);
        await axios("http://localhost:3000/admin/", {
            method: "post",
            data: {
                username, password: cryptPassword
            }
        });
        res.status(201).json({message: "New Admin created successfully"})
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Login Admin
app.post("/admins/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const cryptPassword = bcrypt.hashSync(password, 10);
        await axios("http://localhost:3000/admin/", {
            method: "post",
            data: {
                username, password: cryptPassword
            }
        });
        res.status(201).json({message: "Login Success"})
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Admin change status submission
app.put("/admins/submission/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { data } = await axios("http://localhost:3000/participant/" + id )

        await axios("http://localhost:3000/participant/" + id, {
            method: "put",
            data: {
                name: data.name,
                views: data.views,
                status
            }
        })
        res.status(200).json({message: "Data successfully updated"});
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Add new participant
app.post("/participants", async (req, res) => {
    try {
        const { name } = req.body;
        await axios("http://localhost:3000/participant", {
            method: "post",
            data: {
                name, views: 0, status: "Rejected"
            }
        });
        res.status(200).json({ message: `New Paricipant added successfully` })
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Update Participant Data
app.post("/participants/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Find Participant data by id
        const { data } = await axios.get("http://localhost:3000/participant/" + id);
        
        await axios("http://localhost:3000/participant/" + id, {
            method: "put",
            data: {
                name, views: data.views, status: data.status
            }
        });
        res.status(200).json({ message: `Data Edited Successfully`});
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Create Challenge
app.post("/challenges", async (req, res) => {
    try {
        const { name, duedate } = req.body;
        const InitiatorId = 1;
        const { data } = await axios.get("http://localhost:3000/initiator/" + InitiatorId);

        await axios("http://localhost:3000/challenge", {
            method: "post",
            data: {
                InitiatorId,
                name,
                duedate,
                budget: data.budget,
                rewardBudget: 0,
                submission: []
            }
        })
        res.status(200).json({message: "Challenge created"});
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Update Challenge Data
app.put("/challenges/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, duedate, budget } = req.body;

        // find data challenge
        const { data } = await axios.get("http://localhost:3000/challenge/" + id);

        await axios("http://localhost:3000/challenge/" + id, {
            method: "put",
            data: {
                name: `${!name ? data.name : name }`, duedate: `${!duedate ? data.duedate : duedate}` , budget: `${!budget ? data.budget : budget}`, submission: data.submission, rewardBudget: data.rewardBudget
            }
        });
        res.status(200).json({ message: `Data Edited Successfully`});
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Delete Challenge
app.delete("/challenges/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await axios("http://localhost:3000/challenge/" + id, {
            method: "delete"
        });
        res.status(200).json({ message: `Deleted Successfully`});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Internal Server Error"});
    }
})

// Initiator change submission status
app.put("/initiators/submission/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { data } = await axios("http://localhost:3000/participant/" + id )

        await axios("http://localhost:3000/participant/" + id, {
            method: "put",
            data: {
                name: data.name,
                views: data.views,
                status
            }
        })
        res.status(200).json({message: "Data successfully updated"});
    } catch (error) {
        res.status(500).json({message: "Internal Server Error"});
    }
})




app.listen(port, () => {
    console.log(`Listrning to port ${port}`)
})