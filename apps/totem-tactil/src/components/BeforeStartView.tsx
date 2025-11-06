import View from "../view-manager/View";

export function BeforeStartView() {
  return (
    <View viewId="before-start">
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/before-start.png)" }}
      />
    </View>
  );
}
