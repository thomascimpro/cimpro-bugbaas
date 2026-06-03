import { StyleSheet } from "react-native";

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 18,
    paddingBottom: 132
  },
  title: {
    color: "#102018",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8
  },
  subtitle: {
    color: "#51665d",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18
  },
  button: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    elevation: 4,
    marginTop: 10,
    padding: 15,
    shadowColor: "#0b2b1f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 15
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#b83227",
    borderRadius: 8,
    marginTop: 10,
    padding: 14
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  secondaryButtonText: {
    color: "#17211c",
    fontWeight: "800"
  },
  input: {
    backgroundColor: "#fdfefb",
    borderColor: "#cfd8d3",
    borderRadius: 8,
    borderWidth: 1,
    color: "#17211c",
    marginBottom: 10,
    padding: 12
  },
  label: {
    color: "#17211c",
    fontWeight: "800",
    marginBottom: 6
  },
  error: {
    color: "#b83227",
    fontWeight: "700",
    marginTop: 8
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  }
});
