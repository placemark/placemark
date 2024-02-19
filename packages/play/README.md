# Play

At some point during Placemark development, I tried making a free-as-in-beer
interface that supported a lot of the things that Placemark could, but for free.
The main difference between this and the main application being that Placemark Play
wouldn't have a real server component, so it incurred no real storage or server
costs for me.

People like free stuff and a lot of people don't want or need Placemark's server
storage for maps, so Play got a bit of a following. This subproject is trying to
run Play again.

It's not easy, I'll tell you that! Placemark was, for many reasons, a monolithic
application, and Play was part of that monolith. So there are challenges to slicing
off just a bit of the application.

This directory is basically the application, _minus_ Blitz and the database layer
and all of that. It's a real experiment - expect breakage, and hopefully contribute
pull requests. I'm happy to try and make Placemark useful to folks, and don't
feel bad or bitter about the fate of the company, but realistically if the
open source project is to succeed, it'll need contributors as well as users.
