(function(){
  const ready=()=>{
    const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets=[...document.querySelectorAll('main > section, .category-strip, .products-section, .promo-banner, .brands, .relpps-store-gallery-section, footer, .product-card, .category-card, .benefits > div')];
    targets.forEach((el,i)=>{ if(!el.dataset.reveal) el.dataset.reveal='1'; });
    if(reduce || !window.gsap || !window.ScrollTrigger){
      targets.forEach(el=>el.classList.add('premium-visible'));
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('[data-reveal]').forEach((el,i)=>{
      gsap.fromTo(el,{autoAlpha:0,y:26},{autoAlpha:1,y:0,duration:.72,ease:'power3.out',delay:(i%4)*.035,scrollTrigger:{trigger:el,start:'top 88%',once:true}});
    });
    gsap.utils.toArray('.product-card').forEach((el,i)=>{
      const img=el.querySelector('.product-image img');
      if(img) gsap.fromTo(img,{scale:1.045},{scale:1,duration:1.15,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}});
    });
    gsap.utils.toArray('.store-gallery-card').forEach((el)=>{
      const img=el.querySelector('img');
      if(img) gsap.fromTo(img,{scale:1.04},{scale:1,duration:1.25,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 90%',once:true}});
    });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
