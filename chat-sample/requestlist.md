111/vv #run /vstep pipeline based on /context

-/vstep #show current step

--/vconstraint

---/vrag

---/vrepo

---/vtemplate

--/vprompt

--/#agent run prompt

--/vtest

--/vdoc

-/button #for each step show below button

--/apply #apply last prompt

--/regenerate #apply last prompt

--/vfetchconstraint #run on /vprompt

--/vlint #based on /step and /vconstraint

--/refine #refine last prompt

--/vcritique #refine last prompt

--/vprompt # request to current session [default]show/[with prompt]add/[with prompt]append

--/vcleancontext