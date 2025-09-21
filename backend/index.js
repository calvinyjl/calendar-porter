const express = require('express');
const zip = require('express-zip');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const ics = require('ics');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
                // console.log('Python output chunk:', data.toString());
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

        await fs.promises.writeFile(path.join(__dirname, 'schedule.json'), JSON.stringify(result, null, 2));
        // res.json({
        //     success: true,
        //     message: 'Scraping completed successfully!',
        //     studentId: studentId,
        // });
        res.redirect('/api/calendar');

    } catch (error) {
        console.error('Scraping failed:', error.message);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Scraping failed',
                error: error.message,
                studentId: studentId
            });
        }
    }
});

// Converting the .json to .ics
app.get('/api/calendar', async (req, res) => {
    try {
        const fileContent = await fs.promises.readFile('schedule.json', 'utf8');
        const schedule = JSON.parse(fileContent);
        const uniqueTypes = [...new Set(schedule.map(item => item.type))];

        function transformEventToIcsFormat(event) {
            const [day, month, year] = event.date.split('/').map(Number);
            const fullYear = year + 2000;
            const [startHour, startMinute] = event.local_start.split(':').map(Number);
            const [endHour, endMinute] = event.local_end.split(':').map(Number);

            return {
                start: [fullYear, month, day, startHour, startMinute],
                duration: { hours: endHour - startHour, minutes: endMinute - startMinute },
                title: event.activity,
                description: event.description,
                location: event.location,
                categories: ['School', event.type]
            }
        };

        const events = schedule.map(transformEventToIcsFormat);
        const filePaths = await Promise.all(
            uniqueTypes.map(async (type) => {
                const filteredEvents = events.filter(event => event.categories[1] === type);

                return await new Promise((resolve, reject) => {
                    ics.createEvents(filteredEvents, (err, value) => {
                        if (err) {
                            console.log(err);
                            reject(new Error(`Failed to create ics file: ${err}`));
                        } else {
                            const filePath = path.join(__dirname, 'calendar', `${type}.ics`);
                            fs.promises.writeFile(filePath, value);
                            resolve({
                                path: filePath, name: `${type}.ics`
                            });
                        }
                    });
                });
            })
        )

        res.zip(filePaths);

    } catch (err) {
        console.log('Converting failed:', err.message);
        res.status(500).json({
            success: false,
            message: 'Converting failed',
            error: err.message
        });
    }
});

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
