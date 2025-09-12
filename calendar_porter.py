import requests
from bs4 import BeautifulSoup
import pandas as pd

URL = "https://ical.timetables.qmul.ac.uk/default.aspx?StudentTz&identifier=240068822&timezone=GMT%20Standard%20Time&default=false"
page = requests.get(URL)

# Finding the spreadsheet including the date
soup = BeautifulSoup(page.content, "html.parser")
schedule = soup.find("div", class_="spreadsheet")
if schedule:
    pass
else:
    print("No spreadsheets to read from")

# Separating data into variables
date = schedule.find("span", class_="labelone")
table = schedule.find("table", class_="spreadsheet")
data = [] 
for row in table.find_all("tr"):
    row_data = []
    for cell in row.find_all("td"):
        row_data.append(cell.text)
    data.append(row_data)

df = pd.DataFrame(data)
print(df)
