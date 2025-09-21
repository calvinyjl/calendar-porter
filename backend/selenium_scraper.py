from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import sys

def scrape_qmul_timetable(student_id: int):
    driver = webdriver.Chrome()

    try:
        driver.get('https://timetables.qmul.ac.uk/default.aspx')
        student_tab = driver.find_element(By.ID, 'LinkBtn_studentsetstaff')
        student_tab.click()

        student_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'tObjectInput'))
        )
        student_input.send_keys(student_id)

        week_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'lbWeeks'))
        )
        week_input.send_keys('.ME-Sem1&2')

        report_type_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'dlType'))
        )
        report_type_input.send_keys('List Timetable')

        submit_button = driver.find_element(By.ID, 'bGetTimetable')
        submit_button.click()

        WebDriverWait(driver, 10).until_not(
            EC.title_is('https://timetables.qmul.ac.uk/default.aspx')
        )

        html = driver.page_source
        soup = BeautifulSoup(html, 'html.parser')
        print(soup)

    finally:
        driver.quit()

def parse_timetable_data(soup: BeautifulSoup):
    events = []
    column_titles = []


if __name__ == "__main__":
    id = int(sys.argv[1])
    scrape_qmul_timetable(id)
    sys.stdout.flush()