import java.util.InputMismatchException;
import java.util.Scanner;

public class Addition {

    public static void main(String[] args) {
        try (Scanner scanner = new Scanner(System.in)) {
            double zahl1 = leseZahl(scanner, "Bitte erste Zahl eingeben: ");
            double zahl2 = leseZahl(scanner, "Bitte zweite Zahl eingeben: ");

            double summe = zahl1 + zahl2;
            System.out.println("Die Summe von " + zahl1 + " und " + zahl2 + " ist: " + summe);
        }
    }

    private static double leseZahl(Scanner scanner, String aufforderung) {
        while (true) {
            System.out.print(aufforderung);
            try {
                return scanner.nextDouble();
            } catch (InputMismatchException e) {
                System.out.println("Ungültige Eingabe! Bitte eine Zahl eingeben.");
                scanner.next(); // ungültige Eingabe verwerfen
            }
        }
    }
}
