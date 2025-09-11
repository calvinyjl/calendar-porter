import requests
from bs4 import BeautifulSoup

URL = "https://ical.timetables.qmul.ac.uk/default.aspx?StudentTz&identifier=240068822&timezone=GMT%20Standard%20Time&default=false"
page = requests.get(URL)

soup = BeautifulSoup(page.content, "html.parser")
print(soup.text)
results = soup.find(id="pObjectInput")
if results:
    print(results.text)
else:
    print("womp")