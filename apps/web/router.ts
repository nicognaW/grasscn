export function navigate(url:string){
 history.pushState(null,'',url)
 window.dispatchEvent(new PopStateEvent('popstate'))
}
