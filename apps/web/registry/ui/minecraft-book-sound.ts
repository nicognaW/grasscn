import {bookPageSounds} from "./minecraft-book-sound-assets"
import {getMinecraftSoundVolume} from "./minecraft-sound"
export function playBookPageTurn(){const volume=getMinecraftSoundVolume();if(typeof Audio==='undefined'||volume===0)return;const sound=new Audio(bookPageSounds[Math.floor(Math.random()*bookPageSounds.length)]);sound.volume=.5*volume;sound.playbackRate=1;void sound.play().catch(()=>{})}
