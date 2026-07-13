import Nav from '@/components/Nav'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Services from '@/components/sections/Services'
import Projects from '@/components/sections/Projects'
import Process from '@/components/sections/Process'
import Clients from '@/components/sections/Clients'
import Testimonial from '@/components/sections/Testimonial'
import Documents from '@/components/sections/Documents'
import Contact from '@/components/sections/Contact'
import LatestPosts from '@/components/LatestPosts'

export default async function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Services />
        <Projects />
        <Process />
        <Clients />
        <Testimonial />
        <Documents />
        <LatestPosts />
        <Contact />
      </main>
    </>
  )
}
