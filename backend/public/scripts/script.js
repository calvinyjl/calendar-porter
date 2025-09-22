document.getElementById('scrapeForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = document.querySelector('form');
    const submitBtn = document.querySelector('button[type="submit"]');
    const formData = new FormData(form, submitBtn);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Scraping...';

    console.log(formData.get('studentId'));

    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: formData.get('studentId')
            })
        });

        const result = await response.json();

        setTimeout(() => { window.location.href = result.downloadUrl }, 1000);

    } catch (err) {
        throw err;
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Convert!';
});