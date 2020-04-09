# Voc Reminder

Build up a service to let users create vocabulary list and get notify through Line ChatBot based on [spaced repetition](https://en.wikipedia.org/wiki/Spaced_repetition).

## TODOs

* Line ChatBot tutorials
  * Rich Menu
* Spaced repetition algorithm
* Heroku and PostgreSQL
* Flows
* Test Cases

## Flows (Draw it!)

### Create Voc

* welcome message
  * choose 'add'
    1. show today's list
    2. start list creating (Vocabulary: English, Explanation: Chinese)
    3. end when the number >= 15
  * exit

### Quiz

* welcome message
  * choose 'quiz'
    1. show the number to complete
    2. show English words one by one (with number) and save user's inputs
    3. show user's score and correct answers
  * exit

### Reminder

If the user doesn't take quiz today, sent a warm reminder.

### List (Format!)

* Show all voc that user is not 100% familiar with (sort by familarity).
* Show all vocabulary in a specific period (e.g. this month)
* After users check voc lists, they can remove some by typing voc or number.

### Remove

### More

* Automatically archive vocabulary which is created X (?) ago with 100% familarity.
