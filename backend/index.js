const express = require('express');
const zip = require('express-zip');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const ics = require('ics');
const { mainModule } = require('process');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Endpoints
app.use(express.static('public'));

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
        const scraper = spawn('python', ['selenium_scraper.py', studentId]);

        const result = await new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';

            scraper.stdout.on('data', (data) => {
                output += data.toString();
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

        res.json({
            success: true,
            message: 'Scraping completed successfully',
            downloadUrl: '/api/calendar',
            studentId: studentId
        });

    } catch (error) {
        if (!res.headersSent) {
            console.error('Scraping failed:', error.message);
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
    function transformEventToIcsFormat(event) {
        // Getting list of all weeks from range
        let weeks = [];
        const ranges = event.weeks.split(',');
        ranges.map((range) => {
            if (range.includes('-')) {
                const weekRange = range.split('-').map(Number);
                for (var i = weekRange[0]; i <= weekRange[1]; i++) {
                    weeks.push(i);
                }
            } else {
                weeks.push(parseInt(range));
            };
        });

        const allEvents = [];

        for (const week of weeks) {
            const start = calculateDateFromWeekDay(week, event.day, event.start);

            const [startHour, startMinute] = event.start.split(':').map(Number);
            const [endHour, endMinute] = event.end.split(':').map(Number);

            let [durationHour, durationMinute] = [endHour - startHour, endMinute - startMinute];
            if (durationMinute < 0) {
                durationHour -= 1;
                durationMinute += 60;
            }

            allEvents.push({
                start: start,
                duration: { hours: durationHour, minutes: durationMinute },
                title: event.description,
                description: event.activity,
                location: event.room,
                categories: [event.type, 'School'],
                organizer: { name: event.staff }
            });
        }

        return allEvents;
    };

    function calculateDateFromWeekDay(weekNumber, day, startTime) {
        const START_DATE = new Date(2025, 8, 22);
        const REFERENCE_WEEK = 8;

        const weekDifference = weekNumber - REFERENCE_WEEK;
        const targetDate = new Date(START_DATE)
        targetDate.setDate(START_DATE.getDate() + (weekDifference * 7) + day);

        const [startHour, startMinute] = startTime.split(':').map(Number);

        return [targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate(), startHour, startMinute];
    };

    try {
        const fileContent = await fs.promises.readFile('schedule.json', 'utf8');
        const schedule = JSON.parse(fileContent);
        const uniqueTypes = [...new Set(schedule.map(item => item.type))];

        const events = schedule.map(transformEventToIcsFormat).flat();
        const filePaths = await Promise.all(
            uniqueTypes.map(async (type) => {
                const filteredEvents = events.filter(event => event.categories[0] === type);

                return await new Promise((resolve, reject) => {
                    ics.createEvents(filteredEvents, async (err, value) => {
                        if (err) {
                            console.log(err);
                            reject(new Error(`Failed to create ics file: ${err}`));
                        } else {
                            const filePath = path.join(__dirname, 'calendar', `${type}.ics`);
                            await fs.promises.writeFile(filePath, value);
                            resolve({
                                path: filePath, name: `${type}.ics`
                            });
                        }
                    })
                });
            })
        );

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
