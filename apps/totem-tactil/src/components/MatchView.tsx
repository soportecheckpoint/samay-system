import View from '../view-manager/View';

export function MatchView() {
  return (
    <View viewId="match">
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/match1.png)' }}
      >
        {/* Match slots will be added here in DragDropPhase */}
      </div>
    </View>
  );
}
