const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())

// Endings
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

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

        console.log('Scraping completed successfully:', result);
        res.json({
            success: true,
            message: 'Scraping completed successfully!',
            studentId: studentId,
            data: result
        });

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

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
