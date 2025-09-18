import requests
from bs4 import BeautifulSoup
import pandas as pd
from icalendar import Calendar, Event
from datetime import datetime
import uuid
import sys

# Takes a QMUL student ID and scrapes the timetable website to convert it to a DataFrame
def html_to_dataframe(student_id: int):
    URL = f"https://ical.timetables.qmul.ac.uk/default.aspx?StudentTz&identifier={student_id}&timezone=GMT%20Standard%20Time&default=false"
    page = requests.get(URL)

    # Finding the spreadsheet including the date
    soup = BeautifulSoup(page.content, "html.parser")
    schedules = soup.find_all("div", class_="spreadsheet")
    if schedules is None:
        print("No spreadsheets to read from")

    # Separating schedules into arrays
    data = []
    # for schedule in schedules:
    #     date = schedule.find("span", class_="labelone")
    #     table = schedule.find("table", class_="spreadsheet")
    #     for row in table.find_all("tr"):
    #         row_data = []
    #         row_data.append(date.get_text(strip=True)[-8:])
    #         for cell in row.find_all("td"):
    #             row_data.append(cell.get_text(strip=True))
    #     data.append(row_data)

    schedule = soup.find("div", class_="spreadsheet")
    date = schedule.find("span", class_="labelone")
    table = schedule.find("table", class_="spreadsheet")
    for row in table.find_all("tr"):
        row_data = []
        row_data.append(date.get_text(strip=True)[-8:])
        for cell in row.find_all("td"):
            row_data.append(cell.get_text(strip=True))
    data.append(row_data)

    df = pd.DataFrame(data, columns=["date", "activity", "description", "type", "local_start", "local_end", "location", "london_start", "london_end"])
    return df

# Converts a DataFrame into a .ics calendar file
def dataframe_to_ics(df: pd.DataFrame, filename="calendar.ics"):
    cal = Calendar()
    cal.add('prodid', '-//My Calendar//mxm.dk//')
    cal.add('version', '2.0')

    for index, row in df.iterrows():
        event = Event()

        title = row.get("activity")
        event.add("summary", title)

        date = row.get("date")
        start_date = f"{date} {row.get("london_start")}"
        start_date = pd.to_datetime(start_date)
        event.add("dtstart", start_date)
        end_date = f"{date} {row.get("london_end")}"
        end_date = pd.to_datetime(end_date)
        event.add("dtend", end_date)

        description = row.get("description")
        event.add("description", description)

        location = row.get("location")
        event.add("location", location)

        event.add("uid", str(uuid.uuid4()))

        event.add("dtstamp", datetime.now())

        cal.add_component(event)
    
    with open(filename, "wb") as f:
        f.write(cal.to_ical())

    print(f"Calendar saved to {filename}")

if __name__ == "__main__":
    id = int(sys.argv[1])
    df = html_to_dataframe(id)
    print(df.to_json(orient='records'))
    sys.stdout.flush()


