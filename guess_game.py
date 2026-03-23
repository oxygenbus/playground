import random


def main():
    print("Number Guessing Game")
    print("I'm thinking of a number from 1 to 100.")
    print("Type q to quit.\n")

    target = random.randint(1, 100)
    attempts = 0

    while True:
        guess = input("Your guess: ").strip().lower()
        if guess in {"q", "quit", "exit"}:
            print(f"Bye. The number was {target}.")
            return

        if not guess.isdigit():
            print("Please enter a whole number.\n")
            continue

        value = int(guess)
        attempts += 1

        if value < target:
            print("Too low.\n")
        elif value > target:
            print("Too high.\n")
        else:
            print(f"Nice — you got it in {attempts} guesses!")
            break

    again = input("Play again? (y/n): ").strip().lower()
    if again == "y":
        print()
        main()


if __name__ == "__main__":
    main()
