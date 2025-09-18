const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())

// Endpoints
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Runs scraping script
// Saves output to schedule.json
// Otherwise throws errors
app.post('/api/scrape', async (req, res) => {
    const studentId = req.body.studentId;

    if (!studentId) {
        return res.status(400).send('Error: No student ID given');
    }

    console.log('Running scraper for student:', studentId);

    try {
        const scraper = spawn('python', ['calendar_porter.py', studentId]);

        const result = await new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';

            scraper.stdout.on('data', (data) => {
                output += data.toString();
                console.log('Python output chunk:', data.toString());
            });

            scraper.stderr.on('data', (data) => {
                errorOutput += data.toString();
                console.error('Python error:', data.toString());
            });

            scraper.on('exit', (code) => {
                console.log(`Python process exited with code ${code}`);

                if (code === 0) {
                    try {
                        const parsedOutput = JSON.parse(output.trim());
                        resolve(parsedOutput);
                    } catch (parseError) {
                        console.error('Failed to parse Python output as JSON:', output);
                        reject(new Error(`Invalid JSON from Python: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
                }
            });

            scraper.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                reject(new Error(`Failed to start Python: ${error.message}`));
            });
        });

        console.log('Scraping completed successfully!');
        fs.writeFileSync(path.join(__dirname, 'schedule.json'), JSON.stringify(result, null, 2), (err) => {
            console.log('Writing to schedule.json...');
            if (err) throw new Error(`Failed to write to schedule.json: ${err}`);
        });
        // res.json({
        //     success: true,
        //     message: 'Scraping completed successfully!',
        //     studentId: studentId,
        // });
        res.redirect('/api/calendar');

    } catch (error) {
        console.error('Scraping failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Scraping failed',
            error: error.message,
            studentId: studentId
        });
    }
});

// Converting the .json to .ics
app.get('/api/calendar', (req, res) => {
    res.send('Converting....');
});

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
