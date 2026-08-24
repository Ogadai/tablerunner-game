import BluetoothController from "../../ble/ble-board";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div>
        <BluetoothController />
      </div>
      <div>{children}</div>
    </>
  );
}
