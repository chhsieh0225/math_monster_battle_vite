import { Component, type ReactNode } from 'react';
import { scenePreloader } from '../../utils/scenePreload.ts';
import { battleSpritePreloader } from '../../utils/battleSpritePreload.ts';
import type { BgmTrack } from '../../utils/sfx/bgm.ts';

type Props = {
  sceneKey: string;
  images: readonly string[];
  sprites: readonly string[];
  code?: { isReady: () => boolean; load: () => Promise<unknown> };
  music: BgmTrack | null;
  onPresented: (music: BgmTrack | null, sceneKey: string) => void;
  onCancel: () => void;
  t: (key: string, fallback: string) => string;
  children: ReactNode;
};
type State = { shown: Props | null; failed: boolean };
const tasksFor = (props: Props) => [
  ...[...new Set(props.images.filter(Boolean))].map((src) => ({ src, loader: scenePreloader })),
  ...[...new Set(props.sprites.filter(Boolean))].map((src) => ({ src, loader: battleSpritePreloader })),
];
const ready = (props: Props) => (!props.code || props.code.isReady())
  && tasksFor(props).every(({ src, loader }) => loader.isReady(src));
const planKey = (props: Props) => JSON.stringify([props.sceneKey, props.images, props.sprites]);

/** Keep exactly one live scene until its replacement is decoded; never start hidden cinematics. */
export default class SceneHandoff extends Component<Props, State> {
  state: State = { shown: ready(this.props) ? this.props : null, failed: false };
  private pendingKey = '';
  private generation = 0;
  private cancelPending = () => {};
  private releaseShown = () => {};
  private shownPlan = '';
  private presentedMusic: BgmTrack | null | undefined;
  private presentedKey = '';

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Same-scene combat updates always pass through, even if a cache entry was evicted.
    if (state.shown?.sceneKey === props.sceneKey || ready(props)) return { shown: props, failed: false };
    return null;
  }

  componentDidMount() { this.synchronize(); }
  componentDidUpdate() { this.synchronize(); }
  componentWillUnmount() {
    this.generation++;
    this.cancelPending();
    this.releaseShown();
    this.pendingKey = '';
    this.shownPlan = '';
  }

  private synchronize() {
    const shown = this.state.shown;
    if (shown) {
      const key = planKey(shown);
      if (key !== this.shownPlan) {
        this.releaseShown();
        const stops = tasksFor(shown).map(({ src, loader }) => loader.subscribe(src, () => {}));
        this.releaseShown = () => stops.forEach((stop) => stop());
        this.shownPlan = key;
        if (shown.images.length || shown.sprites.length) window.dispatchEvent(new Event('game:visual-ready'));
      }
      if (this.presentedMusic !== shown.music || this.presentedKey !== shown.sceneKey) {
        this.presentedMusic = shown.music;
        this.presentedKey = shown.sceneKey;
        this.props.onPresented(shown.music, shown.sceneKey);
      }
    }
    if (shown?.sceneKey === this.props.sceneKey) {
      this.generation++;
      this.cancelPending();
      this.pendingKey = '';
      return;
    }
    const key = planKey(this.props);
    if (this.pendingKey === key) return;
    this.cancelPending();
    this.pendingKey = key;
    if (this.state.failed) this.setState({ failed: false });
    const generation = ++this.generation;
    const tasks = tasksFor(this.props);
    const stops = tasks.map(({ src, loader }) => loader.subscribe(src, () => {}));
    const deadline = setTimeout(() => {
      if (generation === this.generation) this.setState({ failed: true });
    }, 15000);
    this.cancelPending = () => { clearTimeout(deadline); stops.forEach((stop) => stop()); };
    // Resolve against the latest props, not the snapshot from before an intro timer or state update.
    void Promise.all([
      this.props.code?.load().then(() => true) ?? Promise.resolve(true),
      ...tasks.map(({ src, loader }) => loader.load(src)),
    ]).then((results) => {
      if (generation !== this.generation) return;
      clearTimeout(deadline);
      if (results.every(Boolean)) this.setState({ shown: this.props, failed: false });
      else this.setState({ failed: true });
    }).catch(() => {
      if (generation === this.generation) {
        clearTimeout(deadline);
        this.setState({ failed: true });
      }
    });
  }

  private retry = () => {
    this.pendingKey = '';
    this.setState({ failed: false });
  };

  render() {
    const pending = this.state.shown?.sceneKey !== this.props.sceneKey;
    const { t } = this.props;
    return <div className="scene-handoff" aria-busy={pending}>
      <div className="scene-handoff-content" inert={pending}>
        {this.state.shown?.children}
      </div>
      {pending && this.state.failed && <div className="scene-handoff-error" role="alert">
        <p>{t('app.loading.artFailed', 'Some artwork could not load. Check your connection and retry.')}</p>
        <div className="visual-loading-actions">
          <button onClick={this.retry}>{t('app.error.retry', 'Retry')}</button>
          <button onClick={this.props.onCancel}>{t('app.error.returnTitle', 'Return to Title')}</button>
          <button onClick={() => window.location.reload()}>{t('app.error.reload', 'Reload')}</button>
        </div>
      </div>}
    </div>;
  }
}
