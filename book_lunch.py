"""
Book lunch for student
"""

import unittest
from selenium import webdriver
import schedule
import time
import os
import base64
import traceback

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders


def save_screenshot(driver: webdriver.Chrome, path: str, height: int = 1000) -> None:
    original_size = driver.get_window_size()
    required_width = driver.execute_script('return document.body.parentNode.scrollWidth')
    print("height:", height)
    driver.set_window_size(required_width, height)
    driver.find_element_by_tag_name('body').screenshot(path)  # avoids scrollbar
    driver.set_window_size(original_size['width'], original_size['height'])

def send_email_with_attachment(*files, status="successfully", toemail="colinz@gmail.com", password="", name=""):
    try:
        mail_content = 'Book lunch {} for student {}, please check the attachments for the screenshots'.format(status, name)

        sender_address = 'sre1expert@gmail.com'
        sender_pass = password
        receiver_address = toemail
        #Setup the MIME
        message = MIMEMultipart()
        message['From'] = sender_address
        message['To'] = receiver_address
        message['Subject'] = 'Book lunch {} for student {}'.format(status, name)
        #The subject line
        #The body and the attachments for the mail
        message.attach(MIMEText(mail_content, 'plain'))
        for f in files:
            attach_file_name = f
            attach_file = open(attach_file_name, 'rb') # Open the file as binary mode
            payload = MIMEBase('application', "png", Name=attach_file_name)
            payload.set_payload((attach_file).read())
            encoders.encode_base64(payload) #encode the attachment
            #add payload header with filename
            payload.add_header('Content-Decomposition', 'attachment', filename=attach_file_name)
            message.attach(payload)

        #Create SMTP session for sending the mail
        session = smtplib.SMTP('smtp.gmail.com', 587) #use gmail with port
        session.starttls() #enable security
        session.login(sender_address, sender_pass) #login with mail_id and password
        text = message.as_string()
        session.sendmail(sender_address, receiver_address, text)
        session.quit()
        print('Mail Sent')
    except Exception as e:
        print(e)
        traceback.print_exc()

def book_lunch():
    password = base64.b64decode(os.environ['password']).decode("utf-8") 
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--disable-gpu')
    driver = webdriver.Chrome(options=chrome_options)
    driver.implicitly_wait(10)
    with open("students.txt") as f:
        for line in f.readlines():
            firstname, lastname, number, phone, email = line.split(",")
            try:
                driver.get("https://forms.office.com/Pages/ResponsePage.aspx?id=OUFKmQZ8HkmAmHkAbVdd4McLBUZVrXBOucUG-rPC3iBUM0k5T0ZYSkI5RDVRMDlIQ1RHT1FDREYzTy4u")

                elem = driver.find_element_by_xpath('//*[@id="Select_0_placeholder"]')
                elem.click()

                elem = driver.find_element_by_xpath('//*[@id="Select_0"]/ul/li[5]')
                elem.click()

                elem = driver.find_element_by_xpath('//*[@id="form-container"]/div/div/div/div/div[1]/div[2]/div[2]/div[2]/div/div[2]/div/div/input')
                elem.send_keys(firstname)

                elem = driver.find_element_by_xpath('//*[@id="form-container"]/div/div/div/div/div[1]/div[2]/div[2]/div[3]/div/div[2]/div/div/input')
                elem.send_keys(lastname)

                elem = driver.find_element_by_xpath('//*[@id="form-container"]/div/div/div/div/div[1]/div[2]/div[2]/div[4]/div/div[2]/div/div/input')
                elem.send_keys(number)

                elem = driver.find_element_by_xpath('//*[@id="form-container"]/div/div/div/div/div[1]/div[2]/div[2]/div[5]/div/div[2]/div/div/input')
                elem.send_keys("0")

                elem = driver.find_element_by_xpath('//*[@id="form-container"]/div/div/div/div/div[1]/div[2]/div[2]/div[6]/div/div[2]/div/div/input')
                elem.send_keys(phone)

                # elem = driver.find_element_by_xpath('//*[@id="form-container"]/div/div/div/div/div[1]/div[2]/div[2]/div[7]/div/div[2]/div/div[1]/div/label/input')
                # elem.click()

                save_file_before = "screenshot_before_submit.png"
                save_screenshot(driver, save_file_before, 1800)

                elem = driver.find_element_by_xpath('//*[@id="form-container"]/div/div/div/div/div[1]/div[2]/div[3]/div[1]/button/div')
                elem.click()

                time.sleep(1)
                save_file_after = "screenshot_after_submit.png"
                save_screenshot(driver, save_file_after, height=1800)

                send_email_with_attachment(save_file_before, save_file_after, toemail=email, password=password, name=firstname)
            except Exception as e:
                print(e)
                traceback.print_exc()
                save_file_error = "screenshot_error.png"
                save_screenshot(driver, save_file_error, height=1800)
                send_email_with_attachment(save_file_error, status="failed", toemail=email, password=password, name=firstname)
    driver.quit()

if __name__ == '__main__':
    utc_time = "02:35"
    schedule.every().monday.at(utc_time).do(book_lunch)
    schedule.every().tuesday.at(utc_time).do(book_lunch)
    schedule.every().wednesday.at(utc_time).do(book_lunch)
    schedule.every().thursday.at(utc_time).do(book_lunch)
    schedule.every().friday.at(utc_time).do(book_lunch)
    while True:
        schedule.run_pending()
        time.sleep(1)
