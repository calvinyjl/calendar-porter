import requests
from bs4 import BeautifulSoup
import pandas as pd

URL = "https://ical.timetables.qmul.ac.uk/default.aspx?StudentTz&identifier=240068822&timezone=GMT%20Standard%20Time&default=false"
page = requests.get(URL)

# Finding the spreadsheet including the date
soup = BeautifulSoup(page.content, "html.parser")
schedules = soup.find_all("div", class_="spreadsheet")
if schedules is None:
    print("No spreadsheets to read from")

# Separating schedules into arrays
data = []
for schedule in schedules:
    date = schedule.find("span", class_="labelone")
    table = schedule.find("table", class_="spreadsheet")
    for row in table.find_all("tr"):
        row_data = []
        row_data.append(date.get_text(strip=True))
        for cell in row.find_all("td"):
            row_data.append(cell.get_text(strip=True))
    data.append(row_data)

df = pd.DataFrame(data)
print(df)


