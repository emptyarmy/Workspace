def lese_zahl(aufforderung):
    while True:
        eingabe = input(aufforderung)
        try:
            return float(eingabe.replace(",", "."))
        except ValueError:
            print("Ungültige Eingabe! Bitte eine Zahl eingeben.")


def main():
    zahl1 = lese_zahl("Bitte erste Zahl eingeben: ")
    zahl2 = lese_zahl("Bitte zweite Zahl eingeben: ")

    summe = zahl1 + zahl2
    print(f"Die Summe von {zahl1} und {zahl2} ist: {summe}")


if __name__ == "__main__":
    main()
